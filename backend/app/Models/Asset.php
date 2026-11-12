<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'asset_tag',
    'type',
    'manufacturer',
    'model',
    'serial_number',
])]
class Asset extends Model
{
    use HasFactory;
}