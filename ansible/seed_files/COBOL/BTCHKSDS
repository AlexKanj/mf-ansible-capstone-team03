       Identification Division.
       Program-Id. KSDS1.
      *****************************************************************
      * Sandbox for demonstrating KSDS processing in batch.
      *****************************************************************
       Environment Division.
       Input-Output Section.
       File-Control.
           Select KSDS-File
               Record Key FD-Rec-Key
               Assign to "KSDSFL"
               Organization Indexed
               Access Dynamic
               File Status KSDS-File-Status.
       Data Divsion.
       File Section.
       FD  KSDS-File.
       01  FD-KSDS-Record.
           05  filler                     pic x(08).
           05  FD-Rec-Key                 pic x(12).
           05  filler                     pic x(60).
       Working-Storage Section.
       01  File-Status-Indicators.
           05  KSDS-File-Status           pic x(02).
               88  KSDS-OK                value "00".
               88  KSDS-EOF               value "10".
               88  KSDS-Duplicate-Key     value "22".
               88  KSDS-Record-Not-Found  value "23".
       01  Record-Work-Areas.
           05  KSDS-Record.
               10  Rec-Date-Stamp         pic x(08).
               10  Rec-Key                pic x(12).
               10  Rec-Data               pic x(60).
       01  Known-Record-Keys.
           05  Key-1 pic x(12) value "JOHNSO001234".
           05  Key-2 pic x(12) value "HARRIS004444".                    
           05  key-3 pic x(12) value "KAMINS112233".
       01  Error-Messages.
           05  Error-Message              pic x(132).
       01  Pseudo-Constants.
           05  Const-Got-Status           pic x(11) value "Got status".
           05  Const-On                   pic x(04) value " on".
           05  Const-Of-DDNAME            pic x(11) value " of KSDSFL.".
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
      * Demonstrate COBOL code for KSDS random access.
      *****************************************************************
           perform 1010-Open

      * Read a record by key
           
           move Key-1 to FD-Rec-Key
           perform 1100-Read-by-Primary-Key

      * Update a record by key 
       
           move "MODIFIED RECORD CONTENTS" to Rec-Data
           rewrite FD-KSDS-Record
               from KSDS-Record
           end-rewrite
           perform 1100-Read-by-Primary-Key

      * Delete a record 
       
           move Key-1 to FD-Rec-Key
           delete KSDS-File record
           if KSDS-OK
               display "Got normal status on DELETE"
               display "    with record key " Key-1
           else
               string Const-Got-Status delimited by size
                      KSDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-DELETE     delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
               exit
           end-if
           perform 1100-Read-by-Primary-Key

      * Write (insert) a record 
           
           move Key-2 to Rec-Key 
           move function current-date to Rec-Date-Stamp
           move "INSERTED THIS RECORD" to Rec-Data
           write FD-KSDS-Record
               from KSDS-Record
           end-write    
           if KSDS-OK
               display "Got normal status on WRITE"
               display "    with record key " Key-2
           else
               string Const-Got-Status delimited by size
                      KSDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-WRITE      delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
               exit
           end-if
           perform 1100-Read-by-Primary-Key
                   
           perform 9000-Close
           .
       1010-Open.
           open i-o KSDS-File
           if not KSDS-OK
               string Const-Got-Status delimited by size
                      KSDS-File-Status delimited by size
                      Const-On         delimited by size
                      Const-OPEN       delimited by size 
                      Const-Of-DDNAME  delimited by size
                  into Error-Message
               end-string 
               perform 8900-Scream-and-Die
           end-if
           .
       1100-Read-by-Primary-Key.
           read KSDS-File
               into KSDS-Record
           end-read
           if KSDS-OK
               display "Random READ by key " Rec-Key ":"
               display KSDS-Record
           else
               string Const-Got-Status delimited by size
                      KSDS-File-Status delimited by size
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
      * Demonstrate COBOL code for KSDS sequential access.
      *****************************************************************
           display space
           display "Read entire KSDS sequentially"
           perform 1010-Open
           perform 2010-Read-Next
           perform with test before
                   until KSDS-EOF
               display KSDS-Record
               perform 2010-Read-Next
           end-perform
            
           perform 9000-Close
           .
       2010-Read-Next.
           read KSDS-File next
               into KSDS-Record
           end-read
           if not KSDS-OK and not KSDS-EOF
               string Const-Got-Status delimited by size
                      KSDS-File-Status delimited by size
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
      * Demonstrate COBOL code for KSDS skip sequential access.
      *****************************************************************
           display space
           display "Skip sequential processing"
           display "    starting with full key KAMINS112233 to EOF"
           perform 1010-Open

           move Key-3 to FD-Rec-Key
           start KSDS-File
               key is equal to FD-Rec-Key
           end-start
           perform 2010-Read-Next
           perform with test before
                   until KSDS-EOF
               display KSDS-Record
               perform 2010-Read-Next
           end-perform
            
           display space
           display "Skip sequential processing"
           display "    starting with partial key KAMINS to EOF"
           
           move low-values to FD-Rec-Key
           move Key-3(1:6) to FD-Rec-Key(1:6) 
           start KSDS-File
               key is greater than or equal to FD-Rec-Key
           end-start
           perform 2010-Read-Next 
           perform with test before
                   until KSDS-EOF
               display KSDS-Record
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
           close KSDS-File
           .                         













