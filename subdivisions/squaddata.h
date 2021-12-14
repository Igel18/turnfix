#ifndef SQUADDATA_H
#define SQUADDATA_H

#include <QString>

class QStandardItem;

struct SquadData
{
    QString name = "";
    int participantsCount = 0;
    int teamsCount = 0;
    int groupsCount = 0;
    QString firstDiscipline = "";

    bool operator==(const SquadData& rhs) const;

    QList< QStandardItem* > toModelItems() const;
};

#endif // SQUADDATA_H
