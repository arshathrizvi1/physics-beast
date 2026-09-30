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
import android.view.View;
import android.view.animation.LinearInterpolator;

public class BrilliantLoadingView extends View {
    private Paint silverPaint;
    private Paint goldPaint;
    private Paint glowPaint;
    private float rotation = 0f;
    private ValueAnimator animator;
    private Bitmap logoBitmap;

    public BrilliantLoadingView(Context context) {
        super(context);
        init();
    }

    private void init() {
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);

        silverPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        silverPaint.setStyle(Paint.Style.STROKE);
        silverPaint.setStrokeWidth(14f);
        silverPaint.setColor(Color.rgb(185, 187, 192));
        silverPaint.setStrokeCap(Paint.Cap.ROUND);

        goldPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        goldPaint.setStyle(Paint.Style.STROKE);
        goldPaint.setStrokeWidth(14f);
        goldPaint.setStrokeCap(Paint.Cap.ROUND);

        glowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        glowPaint.setStyle(Paint.Style.STROKE);
        glowPaint.setStrokeWidth(22f);
        glowPaint.setStrokeCap(Paint.Cap.ROUND);
        glowPaint.setColor(Color.rgb(255, 190, 55));
        glowPaint.setMaskFilter(new BlurMaskFilter(12f, BlurMaskFilter.Blur.NORMAL));

        logoBitmap = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

        animator = ValueAnimator.ofFloat(0f, 360f);
        animator.setDuration(2200L);
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setInterpolator(new LinearInterpolator());
        animator.addUpdateListener(animation -> {
            rotation = (float) animation.getAnimatedValue();
            invalidate();
        });
        animator.start();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        canvas.drawColor(Color.rgb(3, 3, 3));

        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f;
        float radius = Math.min(getWidth(), getHeight()) * 0.29f;

        RectF oval = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);

        canvas.drawOval(oval, silverPaint);

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

        if (logoBitmap != null) {
            float logoSize = radius * 1.6f;
            RectF logoRect = new RectF(cx - logoSize/2, cy - logoSize/2, cx + logoSize/2, cy + logoSize/2);
            canvas.drawBitmap(logoBitmap, null, logoRect, null);
        }
    }

    @Override
    protected void onDetachedFromWindow() {
        if (animator != null) animator.cancel();
        super.onDetachedFromWindow();
    }
}