#ifndef LICENSE_H
#define LICENSE_H

#include "list.h"

class License : public List {
    Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
    virtual void printSubHeader() override;
};

#endif // LICENSE_H
