class CreatePhotos < ActiveRecord::Migration
  def change
    create_table :photos do |t|
      t.text :image1
      t.text :image2

      t.timestamps
    end
  end
end
