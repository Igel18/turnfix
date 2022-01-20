#ifndef REGISTRATIONMATRIX_H
#define REGISTRATIONMATRIX_H

#include "../print.h"

class RegistrationMatrix : public Print {

    Q_OBJECT

public:
    using Print::Print;

    virtual void print(QPrinter*) override;
    virtual void printContent() override;

    static void setTeamMode(bool teamMode);

private:
    static bool teamMode;
};

#endif // REGISTRATIONMATRIX_H
