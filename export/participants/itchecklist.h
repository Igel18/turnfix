#ifndef ITCHECKLIST_H
#define ITCHECKLIST_H

#include "list.h"

class ITCheckList : public List {
    Q_OBJECT

public:
    using List::List;

    virtual void printContent() override;
    virtual void printSubHeader() override;

};

#endif // ITCHECKLIST_H
