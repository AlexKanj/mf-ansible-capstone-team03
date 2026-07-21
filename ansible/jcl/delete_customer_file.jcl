//{{ job_prefix }}DEL  JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//* Delete {{ ds_hlq }}.CUSTOMER.DATA from the system.
//* Safe to run even if the file doesn't exist (IEFBR14 + MOD).
//STEP1    EXEC PGM=IEFBR14
//CUSTFILE DD DSN={{ ds_hlq }}.CUSTOMER.DATA,
//            DISP=(MOD,DELETE,DELETE),
//            SPACE=(TRK,(1,1)),
//            RECFM=FB,LRECL=80,BLKSIZE=800
