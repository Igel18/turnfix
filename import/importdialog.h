#ifndef GYMNET_H
#define GYMNET_H

#include <QWidget>
#include <QDialog>
#include <QFile>
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
    QString filename;
    QFile xmlFile;

private slots:
    void browseFile();
    void parseXml();
    void parseXml2();



signals:
    void act_browse();
};

#endif // GYMNET_H
