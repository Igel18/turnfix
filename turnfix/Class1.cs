namespace turnfix
{
    using turnfix.Model;
    using turnfix.Models;
    using turnfix.Repository;

    internal class Class1
    {
        
        static void Main()
        {
            TurnfixContext context = new TurnfixContext(); 

            // ShowTeilnehmer(context);
            ShowAllEvents(context); 
        }

        public static void ShowTeilnehmer(TurnfixContext context)
        {
            AthleteRepository tr = new AthleteRepository();
            var tmp = tr.ShowAll(context);

            foreach (var item in tmp)
            {
                Console.WriteLine(item.VarVorname + " " + item.VarNachname);
            }
        }

        public static void ShowAllEvents(TurnfixContext context)
        {
            EventRepository vr = new EventRepository();
            var tmp = vr.ShowAll(context);
            foreach (var item in tmp)
            {
                Console.WriteLine(item.VarName);
            }
        }

        public static void ShowStatusTable(TurnfixContext context)
        {
            StatusTableModel model = new StatusTableModel(context);
            
            var tmp = model.getData();
            Console.Write(tmp); 
        }
    }
}
