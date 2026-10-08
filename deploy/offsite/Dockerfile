# The offsite service of compose.yaml (TASK-122, ADR-0123, update of
# 2026-10-02): bash, GNU date, rsync and ssh, to take the database copies
# and the search events to the Storage Box every night (deploy/backup.sh).
FROM alpine:3.20

RUN apk add --no-cache bash coreutils findutils rsync openssh-client
