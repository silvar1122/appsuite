<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');

            $table->string('first_name', 100)->after('id');
            $table->string('last_name', 100)->after('first_name');

            $table->enum('account_status', ['active', 'deactivated'])
                ->default('active')
                ->after('password');

            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments')
                ->restrictOnDelete();

            $table->foreignId('location_id')
                ->nullable()
                ->constrained('locations')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
        });

        DB::table('users')->update([
            'name' => DB::raw("CONCAT(first_name, ' ', last_name)"),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();

            $table->dropForeign(['department_id']);
            $table->dropForeign(['location_id']);

            $table->dropColumn([
                'first_name',
                'last_name',
                'account_status',
                'department_id',
                'location_id',
            ]);
        });
    }
};
