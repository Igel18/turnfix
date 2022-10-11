#ifndef SELECTLAYOUTDIALOG_H
#define SELECTLAYOUTDIALOG_H

#include <QDialog>

namespace Ui {
class SelectLayoutDialog;
}

class EntityManager;

class SelectLayoutDialog : public QDialog
{
    Q_OBJECT

public:
    explicit SelectLayoutDialog(QWidget *parent = nullptr);
    ~SelectLayoutDialog();

    int getLayoutID();
    void setup(EntityManager *em);

private slots:
    void layoutSelectionChange();
    void closeDialog();

private:
    Ui::SelectLayoutDialog *ui;
    EntityManager *m_em = nullptr;
};

#endif // SELECTLAYOUTDIALOG_H
