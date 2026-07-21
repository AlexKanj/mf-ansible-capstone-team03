//{{ job_prefix }}CRT  JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//*
//* JOB:  {{ job_prefix }}CRT - Create customer sequential dataset
//* DESC: Loads 5 sample customer records into {{ ds_hlq }}.CUSTOMER.DATA.
//*       Re-runnable: DELSTEP deletes the output file first so this
//*       job never fails with "dataset already exists".
//*
//***********************************************************************
//* STEP 1: DELSTEP
//*   Runs IEFBR14 (a no-op program) purely to trigger z/OS into
//*   processing the DD below. DISP=(MOD,DELETE,DELETE) means:
//*     MOD        = open for append, or create if it doesn't exist
//*     DELETE     = delete the dataset when the step ends normally
//*     DELETE     = delete the dataset if the step abends
//*   Result: {{ ds_hlq }}.CUSTOMER.DATA is gone after this step,
//*   whether it existed before or not. Safe to run on a fresh system.
//***********************************************************************
//DELSTEP  EXEC PGM=IEFBR14
//CUSTFILE DD DSN={{ ds_hlq }}.CUSTOMER.DATA,
//            DISP=(MOD,DELETE,DELETE),
//            SPACE=(TRK,(1,1)),
//            RECFM=FB,LRECL=80,BLKSIZE=800
//*
//***********************************************************************
//* STEP 2: LOADSTEP
//*   IEBGENER is a system copy utility: reads SYSUT1, writes SYSUT2.
//*   SYSIN DD DUMMY = no control cards needed, use defaults.
//*   SYSUT1 DD *   = inline data (heredoc). The customer records
//*                   between here and /* are the input stream.
//*   SYSUT2        = the output dataset being created on disk.
//*                   DISP=(NEW,CATLG,DELETE):
//*                     NEW    = this dataset must not already exist
//*                     CATLG  = register it in the catalog on success
//*                     DELETE = delete it if the step fails
//*   SPACE=(TRK,(1,1)) = pre-allocate 1 track, extend by 1 if needed
//*   RECFM=FB,LRECL=80 = Fixed Block, 80 bytes per record (like a
//*                        struct: every record is the same length)
//*   BLKSIZE=800       = 10 records packed per physical disk block
//***********************************************************************
//LOADSTEP EXEC PGM=IEBGENER
//SYSPRINT DD SYSOUT=*
//SYSIN    DD DUMMY
//SYSUT1   DD *
C001SMITH               JOHN            NY 10001 ACTIVE
C002JONES               MARY            CA 90210 ACTIVE
C003WILLIAMS            ROBERT          TX 75001 ACTIVE
C004BROWN               LINDA           IL 60601 ACTIVE
C005DAVIS               MICHAEL         FL 33101 SUSPEND
/*
//SYSUT2   DD DSN={{ ds_hlq }}.CUSTOMER.DATA,
//            DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(1,1)),
//            RECFM=FB,LRECL=80,BLKSIZE=800
