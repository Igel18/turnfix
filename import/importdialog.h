#ifndef GYMNET_H
#define GYMNET_H

#include <QWidget>
#include <QDialog>

namespace Ui {
class ImportDialog;
}

class EntityManager;
class Event;

class ImportDialog : public QDialog
{
    Q_OBJECT
public:
    ImportDialog(Event *m_event, EntityManager *em, QWidget *parent = nullptr);

private:
    Ui::ImportDialog *ui;
    Event *m_event;
    EntityManager *m_em;
    char path;

public slots:
    void act_browse();

private slots:
    void browseFile();
    void parseXml();
};

#endif // GYMNET_H
