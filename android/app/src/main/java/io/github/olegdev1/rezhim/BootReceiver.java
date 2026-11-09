package io.github.olegdev1.rezhim;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Alarms are lost on reboot and shift with clock changes: put them back. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        Notifier.channels(c);
        Scheduler.cancelAll(c);
        Scheduler.scheduleAll(c);
    }
}
