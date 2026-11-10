"""The register of the activities the engine draws (TASK-376, ADR-0320).

One module each; a new activity is a new module and one line here, in the
order of the contract (packages/shared-types mirrors it, ADR-0028).
models.py and network.py read their tables from it. An activity the engine
draws before the contract has it waits in ENGINE_ONLY: the engine and its
command line draw it, the API and the app do not know it yet.
"""

from __future__ import annotations

from route_engine.activities import (
    cycling,
    hiking,
    inline_skating,
    mountain_biking,
    paddling,
    running,
    snowshoeing,
    swimming,
)
from route_engine.activities.base import Activity

ENGINE_ACTIVITIES: tuple[Activity, ...] = (
    running.ACTIVITY,
    cycling.ACTIVITY,
    paddling.ACTIVITY,
    swimming.ACTIVITY,
    hiking.ACTIVITY,
    mountain_biking.ACTIVITY,
    inline_skating.ACTIVITY,
    # On the snow (TASK-413, ADR-0342): in ENGINE_ONLY until its part A2.
    snowshoeing.ACTIVITY,
)

# Drawn by the engine, not yet in the contract: none now (snowshoeing was,
# until TASK-413 part A2).
ENGINE_ONLY: tuple[Activity, ...] = ()
