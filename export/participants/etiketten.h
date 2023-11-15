#ifndef ETIKETTEN_H
#define ETIKETTEN_H

#include "list.h"

class Etiketten : public List {
    Q_OBJECT

private:
    QList<QStringList> readParticipants();
    void drawLabel(int x, int y, double height, double width, double boarderleft, double boardertop, QString name, QString jg, QString verein, QString riege, QString wettkampf);

public:
    using List::List;

    virtual void printContent() override;
    virtual void print(QPrinter *printer) override;
};

#endif // ETIKETTEN_H
