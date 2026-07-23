       IDENTIFICATION DIVISION.
       PROGRAM-ID. UPDATECURSOR.

       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.

       EXEC SQL INCLUDE SQLCA END-EXEC.

       01  WS-EMPID        PIC X(06).
       01  WS-FIRSTNAME    PIC X(20).
       01  WS-LASTNAME     PIC X(20).
       01  WS-SALARY       PIC S9(7)V99 COMP-3.
       01  WS-RAISE-AMOUNT PIC S9(7)V99 COMP-3 VALUE 1000.00.
       01  WS-SALARY-THRESHOLD PIC S9(7)V99 COMP-3 VALUE 50000.00.
       01  WS-NEW-SALARY   PIC S9(7)V99 COMP-3.

       EXEC SQL
           DECLARE EMP-CURSOR SCROLL CURSOR FOR
               SELECT EMPID, FIRSTNAME, LASTNAME, SALARY
               FROM EMPLOYEE
               FOR UPDATE OF SALARY
       END-EXEC.

       PROCEDURE DIVISION.

       MAIN-PARA.
 
           DISPLAY "Opening updatable cursor..."

           EXEC SQL
               OPEN EMP-CURSOR
           END-EXEC

           PERFORM UNTIL SQLCODE = 100

               EXEC SQL
                   FETCH NEXT FROM EMP-CURSOR
                   INTO :WS-EMPID, :WS-FIRSTNAME, :WS-LASTNAME, :WS-SALARY
               END-EXEC

               IF SQLCODE = 0
                   DISPLAY "EMP: " WS-EMPID " " WS-FIRSTNAME " " WS-LASTNAME
                   DISPLAY "SALARY: " WS-SALARY

                   IF WS-SALARY < WS-SALARY-THRESHOLD
                       COMPUTE WS-NEW-SALARY = WS-SALARY + WS-RAISE-AMOUNT

                       EXEC SQL
                           UPDATE EMPLOYEE
                           SET SALARY = :WS-NEW-SALARY
                           WHERE CURRENT OF EMP-CURSOR
                       END-EXEC

                       IF SQLCODE = 0
                           DISPLAY "Updated salary to " WS-NEW-SALARY
                           EXEC SQL COMMIT END-EXEC
                           DISPLAY "Committed update."
                       ELSE
                           DISPLAY "Update failed. SQLCODE: " SQLCODE
                           EXEC SQL ROLLBACK END-EXEC
                           DISPLAY "Rolled back due to error."
                       END-IF
                   END-IF

               ELSE IF SQLCODE = 100
                   DISPLAY "End of data."
               ELSE
                   DISPLAY "FETCH ERROR: SQLCODE = " SQLCODE
                   EXEC SQL ROLLBACK END-EXEC
                   GOBACK
               END-IF

           END-PERFORM

           EXEC SQL
               CLOSE EMP-CURSOR
           END-EXEC

           GOBACK.
