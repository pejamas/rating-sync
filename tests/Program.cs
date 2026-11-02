using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using RatingSync;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Net;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Tasks;
using System.Runtime.Remoting.Proxies;
using System.Runtime.Remoting.Messaging;
class Program {
 static int count;
 static void Assert(bool value, string message) { if (!value) throw new Exception(message); count++; }
 static void Main() {
  var dir = Path.Combine(Path.GetTempPath(), "ratingsync-test-" + Guid.NewGuid().ToString("N")); Directory.CreateDirectory(dir);
  try {
   var history = Path.Combine(dir,"history.json"); File.WriteAllText(history,"original");
   try { AtomicStorage.Write(history, stream => { stream.WriteByte(1); throw new IOException("simulated"); }); } catch(IOException) { }
   Assert(File.ReadAllText(history)=="original", "Failed save must retain original history");
   Assert(Directory.GetFiles(dir,"*.tmp").Length==0,"Failed save cleans temp file");
   AtomicStorage.Write(history, stream => { var bytes=Encoding.UTF8.GetBytes("updated"); stream.Write(bytes,0,bytes.Length); });
   Assert(File.ReadAllText(history)=="updated","Atomic replacement succeeds");
   var tsv=Path.Combine(dir,"episode.tsv");
   File.WriteAllText(tsv,"tconst\tparentTconst\tseasonNumber\tepisodeNumber\n"+"tt0000001\ttt1000000\t1\t1\n"+"tt0000002\ttt1000000\t2\t1\n"+"tt0000003\ttt2000000\t1\t1\n");
   Assert(EpisodeIndex.Find(tsv,"tt1000000",1,1,CancellationToken.None).GetAwaiter().GetResult()=="tt0000001","Series lookup");
   Assert(EpisodeIndex.Find(tsv,"tt1000000",2,1,CancellationToken.None).GetAwaiter().GetResult()=="tt0000002","Season separation");
   Assert(EpisodeIndex.Find(tsv,"tt2000000",1,1,CancellationToken.None).GetAwaiter().GetResult()=="tt0000003","Series separation");
   Assert(EpisodeIndex.Find(tsv,"tt1000000",1,99,CancellationToken.None).GetAwaiter().GetResult()==null,"Missing episode");
   Assert(EpisodeIndex.Find(tsv,"tt9000000",1,1,CancellationToken.None).GetAwaiter().GetResult()==null,"Missing series");
   File.AppendAllText(tsv,"tt0000004\ttt1000000\t1\t99\n");
   Assert(EpisodeIndex.Find(tsv,"tt1000000",1,99,CancellationToken.None).GetAwaiter().GetResult()=="tt0000004","Dataset refresh invalidates negative cache");
   var cancel=new CancellationTokenSource();cancel.Cancel();
   try { EpisodeIndex.Find(tsv,"tt1000000",1,1,cancel.Token).GetAwaiter().GetResult(); throw new Exception("Expected cancellation"); } catch(OperationCanceledException) { count++; }
   SelectedItemsStore.SetItems(new System.Collections.Generic.List<BaseItem>{new Movie()});
   typeof(SelectedItemsStore).GetField("_setAtUtc", BindingFlags.NonPublic|BindingFlags.Static).SetValue(null,DateTime.UtcNow.AddMinutes(-3));
   Assert(SelectedItemsStore.HasItems,"Expired target must remain explicit, never switch to full scan");
   Assert(SelectedItemsStore.GetAndClearItems().Count==0,"Expired target aborts empty");
   Assert(!SelectedItemsStore.HasItems,"Queue consumed exactly once");
   int queued=0; var state=TaskState.Idle;
   var scheduled=Stub<IScheduledTask>.Make(m=>m.MethodName=="get_Key" ? (object)"RatingSync" : null);
   var worker=Stub<IScheduledTaskWorker>.Make(m=> m.MethodName=="get_ScheduledTask" ? (object)scheduled : m.MethodName=="get_State" ? (object)state : "task");
   var manager=Stub<ITaskManager>.Make(m=> { if(m.MethodName=="get_ScheduledTasks") return new[]{worker}; queued++; return null; });
   var library=Stub<ILibraryManager>.Make(m=>m.MethodName=="GetItemById" && (long)m.Args[0]==42 ? new Movie() : null);
   var service=new ProgressApiService(library,manager) { ReadConfiguration = () => new PluginConfiguration() };
   var result=(StartScanResponse)service.Post(new StartScanRequest { MovieId="42" });
   Assert(queued==1 && result.TaskId=="task" && result.JobId.Length==32,"Atomic start returns job and queues once");
   try { service.Post(new StartScanRequest { MovieId="42" }); throw new Exception("Expected conflict"); } catch(InvalidOperationException) { count++; }
   Assert(queued==1,"Duplicate start cannot replace queue");
   SelectedItemsStore.GetAndClearItems();ProgressApiService.PendingJobId=null;
   try { service.Post(new StartScanRequest { MovieId="999" }); throw new Exception("Expected empty rejection"); } catch(ArgumentException) { count++; }
   Assert(queued==1 && !SelectedItemsStore.HasItems,"Invalid target never launches full scan");
   state=TaskState.Running;
   try { service.Post(new StartScanRequest { FullLibrary=true }); throw new Exception("Expected busy rejection"); } catch(InvalidOperationException) { count++; }
   state=TaskState.Idle;
   try { service.Post(new StartScanRequest { FullLibrary=true,MovieId="42" }); throw new Exception("Expected ambiguous scope rejection"); } catch(ArgumentException) { count++; }
   ScanHistoryManager.Initialize(dir);
   ScanHistoryManager.UpdateItemEntry("42",7,90,"test"); ScanHistoryManager.MarkFailed("42");
   Assert(ScanHistoryManager.GetEntry("42").LastFailed.HasValue,"Failures tracked separately");
   ScanHistoryManager.UpdateItemEntry("42",8,91,"changed");
   Assert(!ScanHistoryManager.GetEntry("42").LastFailed.HasValue,"Success clears failure cooldown");
   ScanHistoryManager.MarkFailed("42"); ScanHistoryManager.Save(); ScanHistoryManager.Initialize(dir); Assert(ScanHistoryManager.GetEntry("42").LastFailed.HasValue,"Failure retry state survives restart"); Assert(File.Exists(Path.Combine(dir,"scan_history.json")),"History saved");
   ProgressTracker.Start(1,0,"test"); ProgressTracker.AddUpdated("42","Film","change"); ProgressTracker.AddChange("42","IMDb",7,8,"OMDb");
   Assert(ProgressTracker.GetProgress(false).UpdatedDetails.Count==0 && ProgressTracker.GetProgress(false).Changes.Count==0,"Summary excludes details");
   Assert(ProgressTracker.GetProgress().Changes["42"][0].Before==7,"Structured before/after retained");
   ProgressTracker.AddUpdated("9","Second","change"); ProgressTracker.AddUpdated("101","Third","change"); ProgressTracker.AddUpdated("42","Film","another detail");
   Assert(string.Join(",",ProgressTracker.GetProgress().UpdatedOrder)=="42,9,101","Completion order independent of numeric IDs, no duplicate repositioning");
   ProgressTracker.AddSkipped("100","Skip1","reason");ProgressTracker.AddSkipped("2","Skip2","reason");
   Assert(string.Join(",",ProgressTracker.GetProgress().SkippedOrder)=="100,2","Skipped order explicit");
   ProgressTracker.AddFailure("8","Fail1","reason");ProgressTracker.AddFailure("3","Fail2","reason");
   Assert(string.Join(",",ProgressTracker.GetProgress().FailureOrder)=="8,3","Failure order explicit");
   foreach(var type in typeof(StartScanRequest).Assembly.GetTypes().Where(t=>t.GetCustomAttributes(typeof(MediaBrowser.Model.Services.RouteAttribute),false).Length>0)) {
    var auth=(AuthenticatedAttribute)type.GetCustomAttributes(typeof(AuthenticatedAttribute),false).FirstOrDefault();
    Assert(auth!=null && auth.Roles=="Admin","Admin required: "+type.Name);
   }
   Console.WriteLine("PASS: "+count+" checks");
  } finally { Directory.Delete(dir,true); }
 }
}
class Stub<T> : RealProxy where T:class {
 readonly Func<IMethodCallMessage,object> call;
 Stub(Func<IMethodCallMessage,object> c):base(typeof(T)){call=c;}
 public static T Make(Func<IMethodCallMessage,object> c) => (T)new Stub<T>(c).GetTransparentProxy();
 public override IMessage Invoke(IMessage message) { var m=(IMethodCallMessage)message; try{return new ReturnMessage(call(m),null,0,m.LogicalCallContext,m);}catch(Exception e){return new ReturnMessage(e,m);} }
}
