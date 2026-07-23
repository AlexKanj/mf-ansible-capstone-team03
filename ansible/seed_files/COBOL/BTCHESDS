       Identification Division.
       Program-Id. ESDS1.
      *****************************************************************
      * Sandbox for demonstrating ESDS processing in batch.
      *****************************************************************
       Environment Division.
       Input-Output Section.
       File-Control.
           Select ESDS-Input-File
               Assign to "AS-ESDSIN"
               Organization Sequential
               Access Sequential
               File Status ESDS-Input-File-Status.
           Select ESDS-Output-File
               Assign to "AS-ESDSOUT"
               Organization Sequential
               Access Sequential
               File Status ESDS-Output-File-Status.
       Data Division.
       File Section.
       FD  ESDS-Input-File.
       01  ESDS-Input-Record            pic x(80).
       FD  ESDS-Output-File.
       01  ESDS-Output-Record           pic x(80).
       Working-Storage Section.
       01  File-Status-Indicators.
           05  ESDS-Input-File-Status   pic x(2).
               88  ESDS-Input-OK        value "00".
               88  ESDS-Input-EOF       value "10".
           05  ESDS-Output-File-Status  pic x(2).
               88  ESDS-Output-OK       value "00".
       01  Error-Messages.
           05  Error-Message            pic x(132).
           05  IO-Error-Message.
               10  filler               pic x(11) value "Got status".
               10  Error-Status         pic x(02).
               10  filler               pic x(04) value " on".
               10  Error-Operation      pic x(05).
               10  filler               pic x(04) value " of".
               10  Error-DDNAME         pic x(08).
               10  filler               pic x(01) value ".".
       01  Pseudo-Constants.
           05  Const-OPEN               pic x(04) value "OPEN".
           05  Const-CLOSE              pic x(05) value "CLOSE".
           05  Const-READ               pic x(04) value "READ".
           05  Const-WRITE              pic x(05) value "WRITE".
       Procedure Division.
           perform 0000-Initialize
           perform 1000-Process
           perform 9000-Housekeeping
           goback
           .
       0000-Initialize.
           perform 0100-Open-Files
           .
       0100-Open-Files.
           open input ESDS-Input-File
           if not ESDS-Input-OK
               move ESDS-Input-File-Status to Error-Status
               move Const-OPEN to Error-Operation
               move "ESDSIN" to Error-DDNAME
               move IO-Error-Message to Error-Message
               perform 8900-Scream-and-Die
           end-if
           open output ESDS-Output-File
           if not ESDS-Input-OK
               move ESDS-Output-File-Status to Error-Status
               move Const-OPEN to Error-Operation
               move "ESDSUT" to Error-DDNAME
               move IO-Error-Message to Error-Message
               perform 8900-Scream-and-Die
           end-if
           .
       1000-Process.
           perform 1100-Read-Next-Input-Record
           perform with test before
                   until ESDS-Input-EF
               perform 1200-Business-Logic
               perform 1100-Read-Next-Input-Record
           end-perform
           .            
       1100-Read-Next-Input-Record.
           read ESDS-Input-File
           if not ESDS-Input-OK and not ESDS-Input-EOF
               move ESDS-Input-File-Status to Error-Status
               move Const-READ to Error-Operation
               move "ESDSIN" to Error-DDNAME
               move IO-Error-Message to Error-Message
               perform 8900-Scream-and-Die
               exit
           end-if
           .
       1200-Business-Logic.
           move ESDS-Input-Record to ESDS-Output-Record
           perform 7000-Write-Output-Record
           .
       7000-Write-Output-Record.
           write ESDS-Output-Record
           if not ESDS-Output-OK
               move ESDS-Output-File-Status to Error-Status
               move Const-WRITE to Error-Operation
               move "ESDSOUT" to Error-DDNAME
               move IO-Error-Message to Error-Message
               perform 8900-Scream-and-Die
               exit
           end-if
           .
       8900-Scream-and-Die.
           display Error-Message
           move 12 to return-code
           goback
           .
       9000-Housekeeping.
           close ESDS-Output-File
           close ESDS-Input-File
           .












