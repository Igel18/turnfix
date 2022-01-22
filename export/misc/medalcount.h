#ifndef MEDALCOUNT_H
#define MEDALCOUNT_H

#include "../print.h"

class MedalCount : public Print {
    Q_OBJECT

public:
    using Print::Print;

    virtual void print(QPrinter*) override;
    virtual void printContent() override;
    virtual void printSubHeader() override;

private:
    QList<int> ids;
    QMap<int,int> gesamt;
    QMap<int,int> gold;
    QMap<int,int> silber;
    QMap<int,int> bronze;
    QMap<int,QString> namen;

};

#endif // MEDALCOUNT_H
