#ifndef DETAIL_H
#define DETAIL_H

#include "results.h"

class Detail : public Results {
    Q_OBJECT

public:
    using Results::Results;

    virtual void printContent() override;
    virtual void printSubHeader() override;

    static void setPrintAW(bool);

private:
    static bool printAW;

    struct resultData {
        QString disname;
        QString result;
        QString detail;
        QString aw;
    };

    QMap< int, QMap< int, resultData > > results;

    struct position {
        int x;
        int y;
    };
};

#endif // DETAIL_H
