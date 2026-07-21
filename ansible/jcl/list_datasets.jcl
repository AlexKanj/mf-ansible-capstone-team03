//LISTDS   JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//* Discover all datasets under {{ ds_hlq }} - operational inventory
//STEP1    EXEC PGM=IDCAMS
//SYSPRINT DD SYSOUT=*
//SYSIN    DD *
  LISTCAT ENTRIES('{{ ds_hlq }}') ALL
/*
