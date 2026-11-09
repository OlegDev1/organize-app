package io.github.olegdev1.rezhim;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Locale;

/** Notification channels and builders: the live sleep card, reminders, the alarm. */
final class Notifier {

    static final String CH_LIVE = "live";
    static final String CH_REMIND = "remind";
    static final String CH_ALARM = "alarm";
    static final int ID_LIVE = 1;
    static final int ID_ALARM = 2;
    static final int ID_REMIND = 3;
    static final int ID_SERIES = 4;
    private static final int ACCENT = 0xFF3D6B5A;

    static void channels(Context c) {
        NotificationChannel live = new NotificationChannel(CH_LIVE, "Сон сейчас", NotificationManager.IMPORTANCE_DEFAULT);
        live.setDescription("Отсчёт до отбоя и подъёма. Висит, пока актуален.");
        live.setSound(null, null);
        live.enableVibration(false);
        live.setShowBadge(false);
        live.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        NotificationChannel remind = new NotificationChannel(CH_REMIND, "Напоминания", NotificationManager.IMPORTANCE_HIGH);
        remind.setDescription("Готовься ко сну, отбой, собираться.");

        NotificationChannel alarm = new NotificationChannel(CH_ALARM, "Будильник", NotificationManager.IMPORTANCE_HIGH);
        alarm.setDescription("Подъём и свои будильники.");
        alarm.setSound(null, null);
        alarm.enableVibration(false);
        alarm.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        nm(c).createNotificationChannels(Arrays.asList(live, remind, alarm));
    }

    /** The «Dynamic Island» card: ongoing, with a live countdown; promoted to a status bar chip on Android 16. */
    static void live(Context c, Store.Ev e) {
        long now = System.currentTimeMillis();
        Notification.Builder b = new Notification.Builder(c, CH_LIVE)
                .setSmallIcon(R.drawable.ic_stat_moon)
                .setColor(ACCENT)
                .setContentTitle(e.title)
                .setContentText(e.text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(openApp(c, null));
        if (e.target > 0) {
            b.setWhen(e.target).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(e.target > now);
        }
        for (String a : e.actions) {
            b.addAction(new Notification.Action.Builder(icon(c), label(a), openApp(c, a)).build());
        }
        if (Build.VERSION.SDK_INT >= 36) {
            // Same as Notification.Builder#setRequestPromotedOngoing (Live Updates: status bar chip).
            Bundle extras = new Bundle();
            extras.putBoolean("android.requestPromotedOngoing", true);
            b.addExtras(extras);
        }
        nm(c).notify(ID_LIVE, b.build());
    }

    static void clearLive(Context c) {
        nm(c).cancel(ID_LIVE);
    }

    static void remind(Context c, Store.Ev e) {
        Notification n = new Notification.Builder(c, CH_REMIND)
                .setSmallIcon(R.drawable.ic_stat_moon)
                .setColor(ACCENT)
                .setContentTitle(e.title)
                .setContentText(e.text)
                .setAutoCancel(true)
                .setCategory(Notification.CATEGORY_REMINDER)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(openApp(c, null))
                .build();
        nm(c).notify(ID_REMIND, n);
    }

    /** Foreground notification of a ringing alarm; opens the full-screen alarm over the lock screen. */
    static Notification alarm(Context c, Store.Ev e) {
        PendingIntent full = alarmScreen(c, e.group, e.title);
        return new Notification.Builder(c, CH_ALARM)
                .setSmallIcon(R.drawable.ic_stat_moon)
                .setColor(ACCENT)
                .setContentTitle(e.title)
                .setContentText(e.text)
                .setCategory(Notification.CATEGORY_ALARM)
                .setOngoing(true)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setFullScreenIntent(full, true)
                .setContentIntent(full)
                .addAction(dismissAction(c, e.group))
                .build();
    }

    /** Between rings: the series is still on; one tap stops it. */
    static void seriesWaiting(Context c, Store.Ev next) {
        Notification n = new Notification.Builder(c, CH_LIVE)
                .setSmallIcon(R.drawable.ic_stat_moon)
                .setColor(ACCENT)
                .setContentTitle("Следующий сигнал в " + hm(next.at))
                .setContentText("Будильник ещё включён")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setWhen(next.at)
                .setShowWhen(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setCategory(Notification.CATEGORY_ALARM)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(alarmScreen(c, next.group, next.title))
                .addAction(dismissAction(c, next.group))
                .build();
        nm(c).notify(ID_SERIES, n);
    }

    static void clearSeries(Context c) {
        nm(c).cancel(ID_SERIES);
    }

    static PendingIntent openApp(Context c, String action) {
        Intent i = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int code = 1;
        if (action != null) {
            i.setAction("io.github.olegdev1.rezhim.ACT_" + action).putExtra("rezhim_action", action);
            code = 10 + Arrays.asList("day", "night", "bed", "wake").indexOf(action);
        }
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent alarmScreen(Context c, String group, String title) {
        Intent i = new Intent(c, AlarmActivity.class)
                .putExtra("group", group)
                .putExtra("title", title)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        return PendingIntent.getActivity(c, 20, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static Notification.Action dismissAction(Context c, String group) {
        Intent i = new Intent(c, EventReceiver.class).setAction(EventReceiver.ACTION_DISMISS).putExtra("group", group);
        PendingIntent pi = PendingIntent.getBroadcast(c, 30, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String label = group != null && group.startsWith("wake-") ? "Я встал" : "Стоп";
        return new Notification.Action.Builder(icon(c), label, pi).build();
    }

    private static String label(String action) {
        switch (action) {
            case "day":
                return "Принял дневную";
            case "night":
                return "Принял ночную";
            case "bed":
                return "Ложусь";
            case "wake":
                return "Я встал";
            default:
                return action;
        }
    }

    static String hm(long t) {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(t);
    }

    private static Icon icon(Context c) {
        return Icon.createWithResource(c, R.drawable.ic_stat_moon);
    }

    private static NotificationManager nm(Context c) {
        return c.getSystemService(NotificationManager.class);
    }

    private Notifier() {}
}
