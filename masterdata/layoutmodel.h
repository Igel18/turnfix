#ifndef LAYOUTMODEL_H
#define LAYOUTMODEL_H

#include <QAbstractTableModel>

class EntityManager;
class Layout;

class LayoutModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    explicit LayoutModel(EntityManager *em, QObject *parent = nullptr);
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section,
                        Qt::Orientation orientation,
                        int role = Qt::DisplayRole) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;

    void fetchLayouts();

private:
    QList<Layout *> m_layouts;
    EntityManager *m_em;
};

#endif // LAYOUTMODEL_H
