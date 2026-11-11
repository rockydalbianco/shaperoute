"""Deterministic tests of tools/ci_api_shards.py (TASK-438): the split on
made-up files, on a small tree on disk, and on the API's real test files.
No network, no pytest run inside the test."""

from __future__ import annotations

from pathlib import Path

import pytest
from ci_api_shards import (
    API,
    api_test_files,
    collected_files,
    main,
    not_covered,
    split,
    weight,
    weights,
)


def tree(root: Path, files: dict[str, str]) -> Path:
    for name, text in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    return root


def some_tests(count: int) -> str:
    return "".join(f"def test_{index}():\n    pass\n\n" for index in range(count))


def test_a_file_weighs_its_test_functions() -> None:
    source = (
        "import pytest\n\n"
        "def helper():\n    pass\n\n"
        "def test_one():\n    pass\n\n"
        "async def test_two():\n    pass\n\n"
        "class TestThing:\n"
        "    def test_three(self):\n        pass\n\n"
        "    def not_a_test_(self):\n        pass\n"
    )
    assert weight(source) == 3


def test_a_file_without_test_functions_still_weighs_one() -> None:
    assert weight("") == 1
    assert weight("FIXTURE = 'def test_in_a_string'\n") == 1


def test_only_the_files_pytest_collects_are_listed(tmp_path: Path) -> None:
    api = tree(
        tmp_path,
        {
            "tests/test_b.py": some_tests(1),
            "tests/test_a.py": some_tests(2),
            "tests/deep/thing_test.py": some_tests(1),
            "tests/deep/test_c.py": some_tests(1),
            "tests/conftest.py": "",
            "tests/helpers.py": some_tests(4),
            "tests/fixtures/test_data.json": "{}",
            "shaperoute_api/test_not_here.py": some_tests(1),
        },
    )
    assert api_test_files(api) == [
        "tests/deep/test_c.py",
        "tests/deep/thing_test.py",
        "tests/test_a.py",
        "tests/test_b.py",
    ]
    assert weights(api)["tests/test_a.py"] == 2


def test_every_file_is_in_exactly_one_shard() -> None:
    sizes = {f"tests/test_{index:03}.py": 1 + index % 7 for index in range(50)}
    for count in range(1, 9):
        shards = split(sizes, count)
        assert len(shards) == count
        together = [name for shard in shards for name in shard]
        assert sorted(together) == sorted(sizes)
        assert len(together) == len(set(together))


def test_the_shards_are_balanced_by_weight() -> None:
    sizes = {"a": 9, "b": 5, "c": 4, "d": 3, "e": 2, "f": 1}
    shards = split(sizes, 2)
    # 9 | 5 → 9 | 5+4 → 9+3 | 9 → 12 | 9+2 → 12 | 11+1
    assert shards == [["a", "d"], ["b", "c", "e", "f"]]
    assert [sum(sizes[name] for name in shard) for shard in shards] == [12, 12]


def test_the_split_does_not_depend_on_the_order_given() -> None:
    sizes = {f"tests/test_{index:02}.py": 1 + (index * 5) % 11 for index in range(30)}
    backwards = dict(reversed(list(sizes.items())))
    assert split(sizes, 4) == split(backwards, 4)
    # Same weight: the name decides, so a tie never moves a file by chance.
    assert split({"b": 1, "a": 1, "c": 1}, 3) == [["a"], ["b"], ["c"]]


def test_no_shards_is_refused() -> None:
    with pytest.raises(ValueError):
        split({"a": 1}, 0)


def test_the_collected_files_come_from_the_test_ids() -> None:
    lines = [
        "tests/test_a.py::test_one",
        "tests/test_a.py::test_two[x::y]",
        "tests/deep/test_c.py::TestThing::test_three",
        "",
        "3/4 tests collected (1 deselected) in 0.10s",
    ]
    assert collected_files(lines) == {"tests/test_a.py", "tests/deep/test_c.py"}
    assert not_covered(lines, ["tests/test_a.py", "tests/deep/test_c.py"]) == []
    assert not_covered(lines, ["tests/test_a.py"]) == ["tests/deep/test_c.py"]


def test_main_prints_one_shard(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    api = tree(
        tmp_path,
        {
            "tests/test_a.py": some_tests(3),
            "tests/test_b.py": some_tests(2),
            "tests/test_c.py": some_tests(1),
        },
    )
    assert main(["--shard", "1", "--of", "2"], api) == 0
    assert capsys.readouterr().out == "tests/test_a.py\n"
    assert main(["--shard", "2", "--of", "2"], api) == 0
    assert capsys.readouterr().out == "tests/test_b.py\ntests/test_c.py\n"


def test_main_refuses_a_shard_that_would_be_empty_or_is_not_there(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    api = tree(tmp_path, {"tests/test_a.py": some_tests(1)})
    # pytest without files would run the whole suite in that shard.
    assert main(["--shard", "1", "--of", "2"], api) == 1
    assert main(["--shard", "2", "--of", "1"], api) == 1
    assert main(["--shard", "0", "--of", "1"], api) == 1
    assert main(["--shard", "1", "--of", "0"], api) == 1
    assert capsys.readouterr().out == ""


def test_the_check_passes_when_every_collected_file_is_in_a_shard(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    api = tree(
        tmp_path / "api",
        {"tests/test_a.py": some_tests(2), "tests/test_b.py": some_tests(1)},
    )
    listed = tmp_path / "collected.txt"
    listed.write_text(
        "tests/test_a.py::test_0\ntests/test_a.py::test_1\n"
        "tests/test_b.py::test_0\n\n3 tests collected in 0.01s\n",
        encoding="utf-8",
    )
    assert main(["--of", "2", "--check", str(listed)], api) == 0
    out = capsys.readouterr().out
    assert "3 tests collected from 2 files" in out
    assert "shard 2: 1 files, 1 test functions" in out


def test_the_check_fails_on_a_file_no_shard_runs(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    api = tree(tmp_path / "api", {"tests/test_a.py": some_tests(1)})
    listed = tmp_path / "collected.txt"
    listed.write_text(
        "tests/test_a.py::test_0\ntests/checks.py::test_hidden\n", encoding="utf-8"
    )
    assert main(["--of", "1", "--check", str(listed)], api) == 1
    assert "tests/checks.py has tests that no shard runs" in capsys.readouterr().out


def test_the_check_fails_on_an_empty_listing(tmp_path: Path) -> None:
    api = tree(tmp_path / "api", {"tests/test_a.py": some_tests(1)})
    listed = tmp_path / "collected.txt"
    listed.write_text("ERROR: usage\n", encoding="utf-8")
    assert main(["--of", "1", "--check", str(listed)], api) == 1


def test_the_real_suite_splits_into_whole_shards() -> None:
    """Every test file of services/api, once, for any count the matrix of
    ci.yml may get, and no shard without files."""
    sizes = weights(API)
    assert len(sizes) > 100
    for count in range(1, 9):
        shards = split(sizes, count)
        together = [name for shard in shards for name in shard]
        assert sorted(together) == api_test_files(API)
        assert all(shards)
