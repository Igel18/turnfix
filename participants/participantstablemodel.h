#ifndef PARTICIPANTSTABLEMODEL_H
#define PARTICIPANTSTABLEMODEL_H

#include "model/entity/event.h"
#include <QSqlQueryModel>

class ParticipantsTableModel : public QSqlQueryModel
{
    Q_OBJECT

public:
    enum Type { Individual = 0, Team = 1, Group = 2 };

    explicit ParticipantsTableModel(Event *m_event, QObject *parent = nullptr);

    // int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role) const override;

    void updateType(Type type);
    void loadData();

private:
    Event *m_event;
    Type m_type = Individual;
};

#endif // PARTICIPANTSTABLEMODEL_H
