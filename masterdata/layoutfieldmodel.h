#ifndef LAYOUTFIELDMODEL_H
#define LAYOUTFIELDMODEL_H

#include <QAbstractTableModel>

class EntityManager;
class LayoutField;

class LayoutFieldModel : public QAbstractTableModel
{
    Q_OBJECT

public:
    explicit LayoutFieldModel(EntityManager *em, QObject *parent = nullptr);
    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    int columnCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant headerData(int section,
                        Qt::Orientation orientation,
                        int role = Qt::DisplayRole) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;

    void fetchLayoutFields();

private:
    QList<LayoutField *> m_layoutfields;
    EntityManager *m_em;
};

#endif // LAYOUTFIELDMODEL_H





