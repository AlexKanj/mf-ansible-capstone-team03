//{{ job_prefix }}HW   JOB CLASS=A,MSGCLASS=X,MSGLEVEL=(1,1)
//STEP1    EXEC PGM=BPXBATCH
//STDOUT   DD SYSOUT=*
//STDERR   DD SYSOUT=*
//STDPARM  DD *
SH sh -c 'echo "Hello, World (bad) from z/OS!"; exit 8'
/*
