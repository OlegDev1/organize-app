package io.github.olegdev1.rezhim;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONException;
import org.json.JSONObject;

/** Fires scheduled events and handles «Я встал». */
public class EventReceiver extends BroadcastReceiver {

    static final String ACTION_DISMISS = "io.github.olegdev1.rezhim.DISMISS";

    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (ACTION_DISMISS.equals(action)) {
            dismissGroup(c, intent.getStringExtra("group"));
            return;
        }
        if (!Scheduler.ACTION_FIRE.equals(action)) return;
        Store.Ev e = Store.find(c, intent.getIntExtra("code", -1));
        if (e == null || (e.group != null && Store.dismissed(c).contains(e.group))) return;
        switch (e.kind) {
            case "alarm":
                AlarmService.start(c, e);
                break;
            case "remind":
                Notifier.remind(c, e);
                break;
            case "live":
                Notifier.live(c, e);
                break;
            case "clear":
                Notifier.clearLive(c);
                break;
            default:
                break;
        }
    }

    /** Stops a ringing series and all its later alarms; tells the web app he got up. */
    static void dismissGroup(Context c, String group) {
        if (group == null) return;
        Store.dismiss(c, group);
        Scheduler.cancelGroup(c, group);
        AlarmService.stopIfGroup(c, group);
        Notifier.clearSeries(c);
        if (group.startsWith("wake-")) {
            try {
                JSONObject ev = new JSONObject();
                ev.put("type", "woke").put("at", System.currentTimeMillis()).put("night", group.substring(5));
                Store.pushAppEvent(c, ev);
            } catch (JSONException ignored) {
            }
        }
    }
}
