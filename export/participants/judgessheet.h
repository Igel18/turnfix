#ifndef JUDGESSHEET_H
#define JUDGESSHEET_H

#include "list.h"

class JudgesSheet : public List {
    Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
    virtual void printSubHeader() override;

    static void setTeammode(bool set);

private:
    QString currRiege;
    int currDis;
    static bool teammode;
    void printType(QString,QString);

};

#endif // JUDGESSHEET_H
