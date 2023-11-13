#ifndef ETIKETTEN_H
#define ETIKETTEN_H

#include "list.h"

class Etiketten : public List {
    Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
    virtual void printSubHeader() override;
    void drawRow(QString plst, QString name, QString jg, QString verein, QString points="", QString extra="");

};

#endif // ETIKETTEN_H
