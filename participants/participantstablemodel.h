//#ifndef PARTICIPANTSTABLEMODEL_H
//#define PARTICIPANTSTABLEMODEL_H

//#include <QSqlQueryModel>

//class EntityManager;
//class Event;

//class ParticipantsTableModel : public QSqlQueryModel
//{
//    Q_OBJECT

//public:
//    enum Type { Individual = 0, Team = 1, Group = 2 };

//    explicit ParticipantsTableModel(Event *m_event, EntityManager *em, QObject *parent = nullptr);

//    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
//    QVariant headerData(int section, Qt::Orientation orientation, int role) const override;

//    void updateType(Type type);
//    void loadData();

//private:
//    Event *m_event;
//    EntityManager *m_em;
//    Type m_type = Individual;
//};

//#endif // PARTICIPANTSTABLEMODEL_H
