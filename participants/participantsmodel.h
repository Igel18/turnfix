#ifndef PARTICIPANTSMODEL_H
#define PARTICIPANTSMODEL_H

#include <QAbstractTableModel>

class Score;
class EntityManager;
class Event;

class ParticipantsModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    enum class Type {
        Individual,
        Team,
        Group
    };

    explicit ParticipantsModel(Event *event, EntityManager *em, QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QVariant data(int row, int column, int role = Qt::DisplayRole) const {
        return data(this->createIndex(row, column));
    }

    bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole) override;

public slots:
    void load();

private:
    EntityManager* m_em;
    Event* m_event;
    QList< Score* > m_data;
    Type m_Type = Type::Individual;
};

#endif // PARTICIPANTSMODEL_H
