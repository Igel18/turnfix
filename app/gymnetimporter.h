#ifndef GYMNETIMPORTER_H
#define GYMNETIMPORTER_H

#include <QDomDocument>

class GymNetImporter
{
public:
    GymNetImporter();
    void readGymNetXml(QDomDocument *xmlBOM);

private:
    void readDisziplinen(QDomElement *xml);
    void readMannschaft(QDomElement *xml);

};

#endif // GYMNETIMPORTER_H
