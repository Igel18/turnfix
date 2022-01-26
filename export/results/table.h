#ifndef TABLE_H
#define TABLE_H

#include "results.h"

class Table : public Results {
    Q_OBJECT

public:
    using Results::Results;

    virtual void printContent() override;
    virtual void printSubHeader() override;
};

#endif // TABLE_H
