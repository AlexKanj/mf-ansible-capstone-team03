       IDENTIFICATION DIVISION.
       PROGRAM-ID. SCROLLCSR.

       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.

       EXEC SQL INCLUDE SQLCA END-EXEC.

       01  WS-EMPID        PIC X(06).
       01  WS-FIRSTNAME    PIC X(20).
       01  WS-LASTNAME     PIC X(20).
       01  WS-SALARY       PIC S9(7)V99 COMP-3.

       EXEC SQL
           DECLARE EMP-CURSOR SCROLL CURSOR FOR
               SELECT EMPID, FIRSTNAME, LASTNAME, SALARY
               FROM EMPLOYEE
               ORDER BY EMPID
       END-EXEC.

       PROCEDURE DIVISION.

       MAIN-PARA.

           DISPLAY "Opening scrollable cursor..."

           EXEC SQL
               OPEN EMP-CURSOR
           END-EXEC

           *> Fetch first row
           DISPLAY "Fetching FIRST row:"
           EXEC SQL
               FETCH FIRST FROM EMP-CURSOR
               INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
           END-EXEC
           PERFORM DISPLAY-ROW

           *> Fetch next row
           DISPLAY "Fetching NEXT row:"
           EXEC SQL
               FETCH NEXT FROM EMP-CURSOR
               INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
           END-EXEC
           PERFORM DISPLAY-ROW

           *> Fetch relative -1 (go back to first row again)
           DISPLAY "Fetching RELATIVE -1 row:"
           EXEC SQL
               FETCH RELATIVE -1 FROM EMP-CURSOR
               INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
           END-EXEC
           PERFORM DISPLAY-ROW

           *> Fetch LAST row
           DISPLAY "Fetching LAST row:"
           EXEC SQL
               FETCH LAST FROM EMP-CURSOR
               INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
           END-EXEC
           PERFORM DISPLAY-ROW

           *> Attempt to fetch after last (should hit SQLCODE 100)
           DISPLAY "Fetching NEXT after LAST (should be no data):"
           EXEC SQL
               FETCH NEXT FROM EMP-CURSOR
               INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
           END-EXEC
           IF SQLCODE = 100
               DISPLAY "No more rows after LAST."
           ELSE
               PERFORM DISPLAY-ROW
           END-IF

           EXEC SQL
               CLOSE EMP-CURSOR
           END-EXEC

           GOBACK.

       DISPLAY-ROW.
           IF SQLCODE = 0
               DISPLAY "EMPID: " WS-EMPID "  NAME: " WS-FIRSTNAME " " WS-LASTNAME
           ELSE
               DISPLAY "SQL ERROR OR NO DATA: " SQLCODE
           END-IF
           .

