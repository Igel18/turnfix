#ifndef RESULTSTABLEMODEL_H
#define RESULTSTABLEMODEL_H

#include <QAbstractTableModel>
#include <QStringList>

class EntityManager;

class ResultsTableModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    explicit ResultsTableModel( EntityManager *em, QObject *parent = nullptr );

    int rowCount( const QModelIndex &parent = QModelIndex() ) const override;
    int columnCount( const QModelIndex &parent = QModelIndex() ) const override;
    QVariant data( const QModelIndex &index, int role ) const override;
    QVariant headerData( int section, Qt::Orientation orientation, int role = Qt::DisplayRole ) const override;

    void setList( const QList< QStringList > &list, QString nr, int hwk, int typ, bool details = true, bool header = true );

private:
    QList< QStringList > list;
    QStringList headers;
    int wktyp;
    int hwk;
    bool details;
    bool showHeader;
    QString nr;
    EntityManager* m_em;
};
#endif
