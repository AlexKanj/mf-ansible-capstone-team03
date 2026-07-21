//{{ job_prefix }}RPT  JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//* Print all customer records to spool - operational report.
//* Requires {{ ds_hlq }}.CUSTOMER.DATA (run create_customer_file.jcl first).
//STEP1    EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *
  PRINT INDATASET('{{ ds_hlq }}.CUSTOMER.DATA') CHARACTER
/*
