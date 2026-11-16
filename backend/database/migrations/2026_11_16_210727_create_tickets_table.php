<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();

            $table->foreignId('asset_id')
                ->constrained('assets')
                ->restrictOnDelete();

            $table->foreignId('assignment_id')
                ->constrained('asset_assignments')
                ->restrictOnDelete();

            $table->foreignId('reporter_user_id')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('description', 2000);
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamp('closed_at')->nullable();

            // Only open tickets have a value; the unique index permits one per asset.
            $table->unsignedBigInteger('open_asset_id')
                ->nullable()
                ->storedAs("IF(status = 'open', asset_id, NULL)");

            $table->unique('open_asset_id');
            $table->index(['status', 'created_at']);
            $table->index(['reporter_user_id', 'created_at']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
