@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION
PUSHD "%~dp0"

:LOOP
node server.js %*

IF %ERRORLEVEL% EQU 2 (
    TIMEOUT 1
) ELSE (
    TIMEOUT 5
)

GOTO :LOOP