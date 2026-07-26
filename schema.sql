-- ============================================================
-- 教練銷課月結系統 — Supabase Schema（簡化版：單表設計）
-- 一次貼到 Supabase SQL Editor 執行即可完成建置
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 教練名單（僅供登記頁下拉選單使用，不與 sales_records 建外鍵關聯）
-- ------------------------------------------------------------
create table coaches (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 銷課快速登記（單表，不做多表關聯、不自動扣課）
-- ------------------------------------------------------------
create table sales_records (
  id                 uuid primary key default gen_random_uuid(),
  sales_date         date not null default current_date,
  coach_name         text not null,
  member_name        text not null,
  unit_price         numeric(10,2) not null,
  sessions_used      numeric(10,2) not null,
  remaining_sessions numeric(10,2) not null,
  amount             numeric(10,2) generated always as (unit_price * sessions_used) stored,
  created_at         timestamptz not null default now()
);

create index idx_sales_records_sales_date on sales_records (sales_date);

-- ------------------------------------------------------------
-- RLS：MVP 階段不做帳號登入，明確關閉 RLS
-- 之後要公開部署在 GitHub Pages 前，務必補上驗證機制，避免 anon key 被濫用寫入
-- ------------------------------------------------------------
alter table coaches disable row level security;
alter table sales_records disable row level security;
