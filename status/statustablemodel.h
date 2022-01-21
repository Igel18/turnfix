#ifndef STATUSTABLEMODEL_H
#define STATUSTABLEMODEL_H

#include <QAbstractTableModel>
#include <QSqlQuery>

class EntityManager;

class StatusTableModel : public QAbstractTableModel
{
    Q_OBJECT
public:
    StatusTableModel(const QSqlQuery &qry = QSqlQuery(), QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role) const override;
    QVariant headerData(int section, Qt::Orientation orientation, int role = Qt::DisplayRole) const override;

    void setQuery(const QSqlQuery &query);
    void setSingle(bool s);

private:
    QSqlQuery query;
    bool single;
    EntityManager* m_em;
    QSqlDatabase db;
};
#endif
