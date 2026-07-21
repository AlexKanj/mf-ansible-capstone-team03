//{{ job_prefix }}SRT  JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//* Sort customer records by customer ID ascending.
//* Requires {{ ds_hlq }}.CUSTOMER.DATA (run create_customer_file.jcl first).
//* DELSTEP makes this re-runnable.
//DELSTEP  EXEC PGM=IEFBR14
//SORTED   DD DSN={{ ds_hlq }}.CUSTOMER.SORTED,
//            DISP=(MOD,DELETE,DELETE),
//            SPACE=(TRK,(1,1)),
//            RECFM=FB,LRECL=80,BLKSIZE=800
//*
//SORTSTEP EXEC PGM=SORT
//SYSPRINT DD SYSOUT=*
//SYSOUT   DD SYSOUT=*
//SORTIN   DD DSN={{ ds_hlq }}.CUSTOMER.DATA,DISP=SHR
//SORTOUT  DD DSN={{ ds_hlq }}.CUSTOMER.SORTED,
//            DISP=(NEW,CATLG,DELETE),
//            SPACE=(TRK,(1,1)),
//            RECFM=FB,LRECL=80,BLKSIZE=800
//SYSIN    DD *
  SORT FIELDS=(1,4,CH,A)
/*
