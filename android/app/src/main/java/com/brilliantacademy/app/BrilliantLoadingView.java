package com.brilliantacademy.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.view.View;
import android.view.animation.LinearInterpolator;

public class BrilliantLoadingView extends View {
    private Paint silverPaint;
    private Paint goldPaint;
    private Paint glowPaint;
    private Paint textPaint;
    private Paint dotPaint;
    private Paint barBgPaint;
    private Paint barFillPaint;
    private Paint barGlowPaint;
    private float rotation = 0f;
    private float barProgress = 0f;
    private ValueAnimator ringAnimator;
    private ValueAnimator barAnimator;
    private Bitmap logoBitmap;

    public BrilliantLoadingView(Context context) {
        super(context);
        init();
    }

    private void init() {
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);

        // Silver ring base
        silverPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        silverPaint.setStyle(Paint.Style.STROKE);
        silverPaint.setStrokeWidth(10f);
        silverPaint.setColor(Color.rgb(140, 142, 148));
        silverPaint.setStrokeCap(Paint.Cap.ROUND);

        // Gold arc
        goldPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        goldPaint.setStyle(Paint.Style.STROKE);
        goldPaint.setStrokeWidth(10f);
        goldPaint.setStrokeCap(Paint.Cap.ROUND);

        // Gold glow
        glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        glowPaint.setStyle(Paint.Style.STROKE);
        glowPaint.setStrokeWidth(18f);
        glowPaint.setStrokeCap(Paint.Cap.ROUND);
        glowPaint.setColor(Color.rgb(255, 190, 55));
        glowPaint.setMaskFilter(new BlurMaskFilter(12f, BlurMaskFilter.Blur.NORMAL));

        // "LEARN • GROW • ACHIEVE" text
        textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setColor(Color.rgb(230, 185, 76));
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setLetterSpacing(0.35f);
        textPaint.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));

        // Gold dot separator
        dotPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        dotPaint.setColor(Color.rgb(245, 213, 123));
        dotPaint.setTextAlign(Paint.Align.CENTER);

        // Progress bar background
        barBgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        barBgPaint.setStyle(Paint.Style.STROKE);
        barBgPaint.setStrokeWidth(7f);
        barBgPaint.setColor(Color.rgb(60, 45, 15));
        barBgPaint.setStrokeCap(Paint.Cap.ROUND);

        // Progress bar fill
        barFillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        barFillPaint.setStyle(Paint.Style.STROKE);
        barFillPaint.setStrokeWidth(7f);
        barFillPaint.setStrokeCap(Paint.Cap.ROUND);

        // Progress bar glow
        barGlowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        barGlowPaint.setStyle(Paint.Style.STROKE);
        barGlowPaint.setStrokeWidth(12f);
        barGlowPaint.setStrokeCap(Paint.Cap.ROUND);
        barGlowPaint.setColor(Color.rgb(255, 196, 60));
        barGlowPaint.setMaskFilter(new BlurMaskFilter(8f, BlurMaskFilter.Blur.NORMAL));

        // Load logo
        logoBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

        // Ring rotation animation
        ringAnimator = ValueAnimator.ofFloat(0f, 360f);
        ringAnimator.setDuration(2200L);
        ringAnimator.setRepeatCount(ValueAnimator.INFINITE);
        ringAnimator.setInterpolator(new LinearInterpolator());
        ringAnimator.addUpdateListener(animation -> {
            rotation = (float) animation.getAnimatedValue();
            invalidate();
        });
        ringAnimator.start();

        // Progress bar animation (loops: 0% -> 96% over 2.4s)
        barAnimator = ValueAnimator.ofFloat(0.08f, 0.96f);
        barAnimator.setDuration(2400L);
        barAnimator.setRepeatCount(ValueAnimator.INFINITE);
        barAnimator.setInterpolator(new LinearInterpolator());
        barAnimator.addUpdateListener(animation -> {
            barProgress = (float) animation.getAnimatedValue();
        });
        barAnimator.start();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        // Black background
        canvas.drawColor(Color.rgb(3, 3, 3));

        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f;
        float radius = Math.min(getWidth(), getHeight()) * 0.22f;

        RectF oval = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);

        // Draw silver ring base
        canvas.drawOval(oval, silverPaint);

        // Draw rotating gold arc
        canvas.save();
        canvas.rotate(rotation, cx, cy);
        canvas.drawArc(oval, -90f, 120f, false, glowPaint);

        goldPaint.setShader(new LinearGradient(
                cx - radius, cy - radius, cx + radius, cy + radius,
                new int[]{
                        Color.rgb(145, 88, 10),
                        Color.rgb(255, 205, 70),
                        Color.rgb(255, 238, 150),
                        Color.rgb(210, 145, 25)
                },
                null, Shader.TileMode.CLAMP
        ));
        canvas.drawArc(oval, -90f, 120f, false, goldPaint);
        canvas.restore();

        // Draw logo in center of ring
        if (logoBitmap != null) {
            float logoSize = radius * 1.5f;
            RectF logoRect = new RectF(
                    cx - logoSize / 2, cy - logoSize / 2,
                    cx + logoSize / 2, cy + logoSize / 2);
            canvas.drawBitmap(logoBitmap, null, logoRect, null);
        }

        // "LEARN • GROW • ACHIEVE" below the ring
        float textY = cy + radius + getHeight() * 0.06f;
        textPaint.setTextSize(getWidth() * 0.028f);
        dotPaint.setTextSize(getWidth() * 0.02f);

        float totalWidth = textPaint.measureText("LEARN") + textPaint.measureText("GROW")
                + textPaint.measureText("ACHIEVE") + dotPaint.measureText(" • ") * 2;
        float startX = cx - totalWidth / 2f;

        textPaint.setTextAlign(Paint.Align.LEFT);
        dotPaint.setTextAlign(Paint.Align.LEFT);

        canvas.drawText("LEARN", startX, textY, textPaint);
        startX += textPaint.measureText("LEARN");
        canvas.drawText(" • ", startX, textY, dotPaint);
        startX += dotPaint.measureText(" • ");
        canvas.drawText("GROW", startX, textY, textPaint);
        startX += textPaint.measureText("GROW");
        canvas.drawText(" • ", startX, textY, dotPaint);
        startX += dotPaint.measureText(" • ");
        canvas.drawText("ACHIEVE", startX, textY, textPaint);

        // Gold progress bar below the text
        float barY = textY + getHeight() * 0.05f;
        float barHalfWidth = getWidth() * 0.25f;
        float barLeft = cx - barHalfWidth;
        float barRight = cx + barHalfWidth;

        // Bar background
        canvas.drawLine(barLeft, barY, barRight, barY, barBgPaint);

        // Bar fill
        float fillRight = barLeft + (barRight - barLeft) * barProgress;
        barFillPaint.setShader(new LinearGradient(
                barLeft, barY, fillRight, barY,
                new int[]{
                        Color.rgb(184, 120, 18),
                        Color.rgb(255, 216, 106),
                        Color.rgb(255, 241, 169),
                        Color.rgb(230, 167, 45)
                },
                null, Shader.TileMode.CLAMP
        ));
        canvas.drawLine(barLeft, barY, fillRight, barY, barGlowPaint);
        canvas.drawLine(barLeft, barY, fillRight, barY, barFillPaint);
    }

    @Override
    protected void onDetachedFromWindow() {
        if (ringAnimator != null) ringAnimator.cancel();
        if (barAnimator != null) barAnimator.cancel();
        super.onDetachedFromWindow();
    }
}