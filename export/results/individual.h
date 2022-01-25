#ifndef INDIVIDUAL_H
#define INDIVIDUAL_H

#include "results.h"

class Individual : public Results {
    Q_OBJECT

public:
    using Results::Results;

    virtual void printContent() override;
    virtual void printSubHeader() override;
};

#endif // EINZEL_H
