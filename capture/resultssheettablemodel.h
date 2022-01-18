#ifndef MDL_RIEGE_H
#define MDL_RIEGE_H

#include <QAbstractTableModel>
#include <QPointer>
#include <QStringList>

class Discipline;
class EntityManager;
class Event;

class ResultsSheetTableModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    ResultsSheetTableModel(EntityManager* em, Event *m_event, QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role=Qt::DisplayRole) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;
    Qt::ItemFlags flags(const QModelIndex &index) const override;
    bool setData(const QModelIndex &index, const QVariant &value, int role = Qt::EditRole) override;

    void setTableData(QString riege, int geraet, int versuche, bool kuer, bool jury);
    QList<int> getExtraColumnIDs();
    int getCurrentID(const QModelIndex &index);
    int getNextID(const QModelIndex &index);
    int getLastID(const QModelIndex &index);

private:
    EntityManager* m_em;
    Event *m_event;
    QString riege;
    QList< QStringList > starter;
    QMap< int, QMap< int, double > > endwerte;
    QMap< int, QMap< int, QMap < int, double > > > detailwerte;
    QPointer< Discipline > m_pDisciplineInfo;
    int geraet = -1;
    bool kuer;
    int versuche;
    QList< int > extraColumns;
    QStringList extraColumnNames;
};

#endif
