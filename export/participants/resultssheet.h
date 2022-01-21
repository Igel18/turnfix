#ifndef RESULTSSHEET_H
#define RESULTSSHEET_H

#include "list.h"

class ResultsSheet : public List {

Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
    virtual void printSubHeader() override;

private:
    QString currRiege;
    int currDis;
    void printType(QString,QString);

};

#endif // RESULTSSHEET_H
