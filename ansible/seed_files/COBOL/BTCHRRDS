       Identification Division.
       Program-Id. RRDS1.
      *****************************************************************
      * Sandbox for demonstrating RRDS processing in batch.
      *****************************************************************
       Environment Division.
       Input-Output Section.
       File-Control.
           Select RRDS-File
               Record Key RRN
               Assign to "RRDSFL"
               Organization Relative
               Access Dynamic
               File Status RRDS-File-Status.
           Select RRDS-File-Seq
               Record Key RRN
               Assign to "RRDSFL"
               Organization Relative
               Access Sequential
               File Status RRDS-File-Status.
       Data Divsion.
       File Section.
       FD  RRDS-File.
       01  FD-RRDS-Record                 pic x(80).
       FD  RRDS-File-Seq.
       01  FD-RRDS-Record-Seq             pic x(80).
       Working-Storage Section.
       01  RRN                            pic 9(8).
       01  File-Status-Indicators.
           05  RRDS-File-Status           pic x(02).
               88  RRDS-OK                value "00".
               88  RRDS-EOF               value "10".
               88  RRDS-Duplicate-Key     value "22".
               88  RRDS-Record-Not-Found  value "23".
       01  Record-Work-Areas.
           05  RRDS-Record.
               10  Rec-Data               pic x(80).
       01  Known-Record-Keys.
           05  RRN-1                      pic 9(8) value 1.
           05  RRN-2                      pic 9(8) value 2.
           05  RRN-3                      pic 9(8) value 3.
       01  Error-Messages.
           05  Error-Message              pic x(132).
       01  Pseudo-Constants.
           05  Const-Got-Status           pic x(11) value "Got status".
           05  Const-On                   pic x(04) value " on".
           05  Const-Of-DDNAME            pic x(11) value " of RRDSFL.".
           05  Const-OPEN                 pic x(04) value "OPEN".
           05  Const-CLOSE                pic x(05) value "CLOSE".
           05  Const-READ                 pic x(04) value "READ".
           05  Const-READ-NEXT            pic x(09) value "READ NEXT".
           05  Const-START                pic x(05) value "START".
           05  Const-WRITE                pic x(05) value "WRITE".
           05  Const-REWRITE              pic x(07) value "REWRITE".
           05  Const-DELETE               pic x(06) value "DELETE".

       Procedure Division.
           perform 1000-Random
           perform 2000-Sequential
           perform 3000-Skip-Sequential
           goback
           .
       1000-Random.
      *****************************************************************
      * Demonstrate COBOL code for RRDS random access.
      *****************************************************************
           perform 1010-Open

      * Read a record by Relative Record Number
           
           move RRN-1 to RRN
           perform 1100-Read-by-RRN

      * Update the current record
       
           move "MODIFIED RECORD CONTENTS" to Rec-Data
           rewrite FD-RRDS-Record
               from RRDS-Record
           end-rewrite
           perform 1100-Read-by-RRN

      * Delete a record 
       
           move RRN-1 to RRN
           delete RRDS-File record
           if RRDS-OK
               display "Got normal status on DELETE"
               display "    with RRN " RRN
           else
               string Const-Got-Status delimited by size
                      RRDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-DELETE     delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
               exit
           end-if
           perform 1100-Read-by-RRN
           perform 9000-Close

      * Write (append) a record 
           
           open extend RRDS-File-Seq
           move zero to RRN
           move "APPENDED THIS RECORD" to Rec-Data
           write FD-RRDS-Record-Seq
               from RRDS-Record
           end-write    
           if RRDS-OK
               display "Got normal status on WRITE"
               display "    with RRN " RRN
           else
               string Const-Got-Status delimited by size
                      RRDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-WRITE      delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
               exit
           end-if
           close RRDS-File-Seq
           perform 1010-Open
           read RRDS-File
               into RRDS-Record
           end-read
           display "After WRITE, READ of RRN " RRN
           display "    got File Status " RRDS-File-Status    
           perform 9000-Close
           .
       1010-Open.
           open i-o RRDS-File
           if not RRDS-OK
               string Const-Got-Status delimited by size
                      RRDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-OPEN       delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
           end-if
           .
       1100-Read-by-RRN.
           read RRDS-File
               into RRDS-Record
           end-read
           if RRDS-OK
               display "Random READ by RRN " RRN ":"
               display RRDS-Record
           else
               string Const-Got-Status delimited by size
                      RRDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-READ       delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8910-Scream
           end-if
           .
       2000-Sequential.       
      *****************************************************************
      * Demonstrate COBOL code for RRDS sequential access.
      *****************************************************************
           display space
           display "Read entire RRDS sequentially"
           perform 1010-Open
           perform 2010-Read-Next
           perform with test before
                   until RRDS-EOF
               display RRDS-Record
               perform 2010-Read-Next
           end-perform
           perform 9000-Close
           .
       2010-Read-Next.
           read RRDS-File next
               into RRDS-Record
           end-read
           if not RRDS-OK and not RRDS-EOF
               string Const-Got-Status delimited by size
                      RRDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-READ-NEXT  delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
           end-if
           .
       3000-Skip-Sequential.       
      *****************************************************************
      * Demonstrate COBOL code for RRDS skip sequential access.
      *****************************************************************
           display space
           display "Skip sequential processing"
           display "    starting with RRN 3 to EOF"
           perform 1010-Open

           move RRN-3 to RRN
           start RRDS-File
               key is equal to RRN
           end-start
           perform 2010-Read-Next
           perform with test before
                   until RRDS-EOF
               display RRDS-Record
               perform 2010-Read-Next
           end-perform
           perform 9000-Close
           .
       8900-Scream-and-Die.
           perform 8910-Scream
           perform 8920-Die
           .
       8910-Scream.
           display Error-Message
           .
       8920-Die.
           move 12 to return-code
           goback
           .
       9000-Close.
           close RRDS-File
           .                         













