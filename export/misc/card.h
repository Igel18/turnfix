#ifndef CARD_H
#define CARD_H

#include "../print.h"

class Card : public Print {
    Q_OBJECT

public:
    using Print::Print;

public slots:
    virtual void print(QPrinter*) override;
    virtual void printContent() override;
};

#endif // CARD_H
