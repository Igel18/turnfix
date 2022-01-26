#ifndef ROUND_H
#define ROUND_H

#include "results.h"

class Round : public Results {
    Q_OBJECT

public:
    using Results::Results;

    virtual void printContent() override;
    virtual void printSubHeader() override;

    static void setUseExtraScore(bool);

private:
    static bool useExtraScore;

};

#endif // ROUND_H
