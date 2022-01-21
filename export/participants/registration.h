#ifndef REGISTRATION_H
#define REGISTRATION_H

#include "list.h"

class Registration : public List {
    Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
};

#endif // REGISTRATION_H
