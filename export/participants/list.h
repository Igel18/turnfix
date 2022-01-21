#ifndef LISTE_H
#define LISTE_H

#include "../print.h"

class List : public Print {
    Q_OBJECT

public:
    using Print::Print;

    virtual void printSubHeader() override;

public slots:
    virtual void print(QPrinter*) override;

protected:
    bool checkWKChange(QString currWK,QString lastWK, double lineHeight, bool newPageCreated=false);
    QString currWK;

};

#endif // LISTE_H
