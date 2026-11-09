package io.github.olegdev1.rezhim;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Puts events into AlarmManager. Wake-ups use setAlarmClock: exact, survives Doze, shows the alarm icon. */
final class Scheduler {

    static final String ACTION_FIRE = "io.github.olegdev1.rezhim.FIRE";
    private static final int FIRST_CODE = 1000;

    /** Replaces everything scheduled with a fresh list from the web app. */
    static void replace(Context c, JSONArray events) {
        cancelAll(c);
        List<Store.Ev> list = new ArrayList<>();
        for (int i = 0; i < events.length(); i++) {
            JSONObject o = events.optJSONObject(i);
            if (o != null) list.add(Store.Ev.from(o, FIRST_CODE + i));
        }
        Store.saveEvents(c, list);
        scheduleAll(c);
    }

    /** Schedules stored future events and shows the live card that applies right now. Also used after reboot. */
    static void scheduleAll(Context c) {
        long now = System.currentTimeMillis();
        Set<String> dismissed = Store.dismissed(c);
        Store.Ev current = null;
        for (Store.Ev e : Store.events(c)) {
            if (e.group != null && dismissed.contains(e.group)) continue;
            if (e.at <= now) {
                if (e.isLive() && (current == null || e.at >= current.at)) current = e;
                continue;
            }
            set(c, e);
        }
        if (current != null && "live".equals(current.kind)) Notifier.live(c, current);
        else Notifier.clearLive(c);
    }

    static void cancelAll(Context c) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        for (Store.Ev e : Store.events(c)) am.cancel(fireIntent(c, e.code));
    }

    /** Cancels the rest of a group (after «Я встал»). */
    static void cancelGroup(Context c, String group) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        for (Store.Ev e : Store.events(c)) if (group.equals(e.group)) am.cancel(fireIntent(c, e.code));
    }

    /** Next event of a group after now, or null. */
    static Store.Ev nextInGroup(Context c, String group) {
        long now = System.currentTimeMillis();
        if (group == null || Store.dismissed(c).contains(group)) return null;
        Store.Ev best = null;
        for (Store.Ev e : Store.events(c))
            if (group.equals(e.group) && e.at > now && (best == null || e.at < best.at)) best = e;
        return best;
    }

    static boolean canExact(Context c) {
        return Build.VERSION.SDK_INT < 31 || c.getSystemService(AlarmManager.class).canScheduleExactAlarms();
    }

    private static void set(Context c, Store.Ev e) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = fireIntent(c, e.code);
        try {
            if (!canExact(c)) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, e.at, pi);
            else if ("alarm".equals(e.kind))
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(e.at, Notifier.openApp(c, null)), pi);
            else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, e.at, pi);
        } catch (SecurityException ex) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, e.at, pi);
        }
    }

    private static PendingIntent fireIntent(Context c, int code) {
        Intent i = new Intent(c, EventReceiver.class).setAction(ACTION_FIRE).putExtra("code", code);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Scheduler() {}
}
